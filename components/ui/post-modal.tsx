"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import ExifReader from "exifreader"
// import { supabase } from "@/lib/supabaseClient"

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCity: string
  onPosted?: () => void
}

// Utility functions for handling base64 HEIC data (based on community solution)
function convertBase64ToUInt8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present (e.g., "data:image/heic;base64,")
  if (base64.startsWith("data:")) {
    base64 = base64.split(",")[1];
  }

  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }

  return bytes;
}

// Validate if file appears to be a valid HEIC file
function isValidHeicFile(file: File): boolean {
  // Basic validation - check file size and type
  if (file.size === 0) return false;
  if (file.size > 50 * 1024 * 1024) return false; // Reject files over 50MB
  
  const isHeicType = file.type === 'image/heic' || file.type === 'image/heif';
  const hasHeicExtension = /\.(heic|heif)$/i.test(file.name);
  
  return isHeicType || hasHeicExtension;
}

// Fallback conversion method using base64 (adapted for heic-to)
async function convertHEICWithBase64Fallback(file: File, heicTo: (options: { blob: Blob; type: string; quality: number }) => Promise<Blob>): Promise<Blob> {
  console.log('Trying base64 fallback method...')
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const base64Data = String(reader.result);
        const uint8Array = convertBase64ToUInt8Array(base64Data);
        const blob = new Blob([uint8Array.buffer as ArrayBuffer], { type: "image/heic" });
        
        const convertedBlob = await heicTo({
          blob: blob,
          type: "image/jpeg",
          quality: 1
        });
        
        resolve(convertedBlob as Blob);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export function PostModal({ isOpen, onClose, selectedCity, onPosted }: PostModalProps) {
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    image: null as File | null,
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0]
    if (originalFile) {
      let processedFile = originalFile

      // Check if the file is HEIC and convert to JPEG
      const isHeic = originalFile.type === 'image/heic' || 
                     originalFile.type === 'image/heif' ||
                     originalFile.name.toLowerCase().endsWith('.heic') ||
                     originalFile.name.toLowerCase().endsWith('.heif')

      if (isHeic) {
        // Validate the HEIC file first
        if (!isValidHeicFile(originalFile)) {
          console.warn('Invalid HEIC file detected, skipping conversion')
          processedFile = originalFile
        } else {
          try {
            console.log('HEIC file detected, converting to JPEG...', {
              name: originalFile.name,
              size: originalFile.size,
              type: originalFile.type
            })
            
            // Dynamic import to avoid SSR issues - using heic-to library
            const { heicTo, isHeic } = await import('heic-to')
            
            // Double-check with heic-to's built-in validation
            const isValidHeicFile = await isHeic(originalFile);
            if (!isValidHeicFile) {
              console.warn('heic-to validation failed - file may not be a valid HEIC');
              throw new Error('File validation failed - not a valid HEIC file');
            }
            
            let convertedBlob: Blob;
            
            try {
              // Primary method: Convert directly using heic-to
              convertedBlob = await heicTo({
                blob: originalFile,
                type: "image/jpeg",
                quality: 1 // Maximum quality (0-1)
              });
            } catch (primaryError: unknown) {
              const errorMessage = primaryError instanceof Error ? primaryError.message : 'Unknown error'
              console.warn('Primary conversion failed, trying base64 fallback:', errorMessage)
              
              // Fallback method: Convert using base64 approach
              convertedBlob = await convertHEICWithBase64Fallback(originalFile, heicTo);
            }
            
            // Create a File object from the converted blob
            processedFile = new File([convertedBlob], 
              originalFile.name.replace(/\.(heic|heif)$/i, '.jpg'), 
              { type: 'image/jpeg' }
            )
            console.log('HEIC conversion successful', {
              originalSize: originalFile.size,
              convertedSize: processedFile.size
            })
          } catch (conversionError: unknown) {
            const error = conversionError as { code?: number; message?: string }
            console.error('Failed to convert HEIC file:', {
              error: conversionError,
              code: error?.code,
              message: error?.message,
              fileName: originalFile.name,
              fileSize: originalFile.size,
              fileType: originalFile.type
            })
            
            // Provide specific error messages based on error code
            if (error?.code === 2) {
              console.error('LIBHEIF format error - the file may be corrupted or not a valid HEIC file')
            } else if (error?.message?.includes('File validation failed')) {
              console.error('HEIC validation failed - file format not recognized')
            }
            
            // If conversion fails, use the original file
            processedFile = originalFile
          }
        }
      }

      // Try to extract GPS coordinates from the ORIGINAL file (before conversion)
      // This ensures we don't lose EXIF data during HEIC->JPEG conversion
      let gpsLocation: string | null = null;
      try {
        const tags = await ExifReader.load(originalFile)
        
        // Extract GPS coordinates if available
        const gpsLat = tags.GPSLatitude
        const gpsLatRef = tags.GPSLatitudeRef
        const gpsLon = tags.GPSLongitude
        const gpsLonRef = tags.GPSLongitudeRef
        
        if (gpsLat && gpsLatRef && gpsLon && gpsLonRef) {
          // ExifReader already provides decimal degrees in the description field
          const latitude = typeof gpsLat.description === 'number' ? gpsLat.description : parseFloat(gpsLat.description?.toString() || '0')
          const longitude = typeof gpsLon.description === 'number' ? gpsLon.description : parseFloat(gpsLon.description?.toString() || '0')
          
          // Handle longitude sign based on reference (West = negative)
          const finalLongitude = gpsLonRef.description?.includes('West') ? -Math.abs(longitude) : longitude
          
          console.log('GPS coordinates extracted from original HEIC:', { latitude, longitude: finalLongitude })
          
          // Try to get a readable address using reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${finalLongitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'HackMIT-311-App'
                }
              }
            )
            const geocodeData = await response.json()
            
            let locationString = `${latitude.toFixed(6)}, ${finalLongitude.toFixed(6)}`
            
            if (geocodeData.display_name) {
              // Extract street address from the display name
              const address = geocodeData.address
              if (address) {
                const streetParts = []
                if (address.house_number) streetParts.push(address.house_number)
                if (address.road) streetParts.push(address.road)
                if (streetParts.length > 0) {
                  locationString = streetParts.join(' ')
                  if (address.neighbourhood || address.suburb) {
                    locationString += `, ${address.neighbourhood || address.suburb}`
                  }
                } else {
                  locationString = geocodeData.display_name.split(',').slice(0, 2).join(',')
                }
              }
            }
            
            gpsLocation = locationString;
          } catch (geocodeError) {
            console.log('Reverse geocoding failed, using coordinates:', geocodeError)
            // Fall back to coordinates
            gpsLocation = `${latitude.toFixed(6)}, ${finalLongitude.toFixed(6)}`
          }
        }
      } catch (error) {
        console.log('No GPS data found in original image or error extracting GPS:', error)
      }

      // Set form data with processed file and GPS location
      setFormData((prev) => ({ 
        ...prev, 
        image: processedFile,
        location: prev.location || (gpsLocation ?? "") // Use GPS location if available and field is empty
      }))
    }
  }

  const handleSubmit = async () => {
    try {
      let imageUrl: string | undefined
      if (formData.image) {
        const body = new FormData()
        body.append('file', formData.image)
        const resUp = await fetch('/api/storage/upload', { method: 'POST', body })
        const jsonUp = await resUp.json()
        if (!resUp.ok) throw new Error(jsonUp?.error || 'upload failed')
        imageUrl = jsonUp.url as string
      }

      const payload = {
        description: formData.description,
        street_address: formData.location,
        city: selectedCity.toUpperCase(),
        imageUrl,
      }
      const res = await fetch('/api/report/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'create failed')

      setFormData({ description: "", location: "", image: null })
      onPosted?.()
      onClose()
    } catch (e) {
      console.error('post create failed', e)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 max-w-md mx-4" showCloseButton={false} aria-describedby={undefined}>
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Create New Post</DialogTitle>
        <DialogDescription className="sr-only">Fill out the form to create a new report.</DialogDescription>
        
        {/* Top header with cancel and post buttons */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={onClose} variant="ghost" className="glass-button rounded-full text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.location}
            className="glass-button rounded-full bg-primary hover:bg-primary/90 text-white"
          >
            Post
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">
              Location
            </Label>
            <Input
              id="location"
              placeholder={`Address or intersection in ${selectedCity}`}
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              className="glass-card border-border/50 bg-input/50 text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Provide more details about the issue..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="glass-card border-border/50 bg-input/50 text-foreground resize-none"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Photo (Optional)</Label>
            {formData.image ? (
              <div className="relative h-32">
                <Image
                  src={URL.createObjectURL(formData.image)}
                  alt="Upload preview"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer glass-card hover:bg-card/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload photo</span>
                <input type="file" accept="image/*,.heic,.heif" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

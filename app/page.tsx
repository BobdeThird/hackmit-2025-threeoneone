'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Page() {
  const [generation, setGeneration] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <Button
        onClick={async () => {
          setIsLoading(true);

          await fetch('/api/ranking', {
            method: 'POST',
            body: JSON.stringify({
              report1: {
                street_address: '12 Greenwich Park, Roxbury, MA',
                coordinates: [42.3317, -71.0653],
                images: 'https://spot-boston-res.cloudinary.com/image/upload/f_auto/c_scale,dpr_2.0,w_200/v1/boston/production/b9ejmlrbjhckdj0krs7n',
                timestamp: '2025-01-01',
                description: 'There are several broken bricks in the sidewalk at 12 Greenwich Park, Roxbury, MA. The bricks are lifting up and pose a tripping hazard. I tripped and injured my knee and leg.',
              },
              report2: {
                street_address: '370 Western Ave, Brighton, Ma, 02135',
                coordinates: [42.3500, -71.1500],
                images: 'https://spot-boston-res.cloudinary.com/image/upload/f_auto/c_scale,dpr_2.0,w_200/v1/boston/production/ghtd90ll1yaslfidqucn',
                timestamp: '2025-01-01',
                description: 'Rat sighting in shaws parking lot. Multiple rats observed in the parking area.',
              },
            }),
          }).then(async response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error('Response is not JSON');
            }
            
            const json = await response.json();
            setGeneration(json);
            setIsLoading(false);
          }).catch(error => {
            console.error('Error:', error);
            setGeneration({ error: error.message });
            setIsLoading(false);
          });
        }}
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate'}
      </Button>

      {isLoading ? (
        'Loading...'
      ) : (
        <pre>{JSON.stringify(generation, null, 2)}</pre>
      )}
    </div>
  );
}
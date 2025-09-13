"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "~/lib/supabase";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";

interface Message {
  text: string;
  userId: string;
  timestamp: number;
}

export default function Room({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const sb = supabaseClient();
    const channel = sb
      .channel(`room:${params.id}`)
      .on("broadcast", { event: "message" }, (payload) => {
        const message = payload.payload as Message;
        setMessages((prev) => [...prev, message]);
      })
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [params.id]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`/api/room/${params.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage }),
      });

      if (response.ok) {
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="mb-6 text-2xl font-bold">Room: {params.id}</h1>
      
      <Card className="mb-4 p-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet. Be the first to say hello!</p>
          ) : (
            messages.map((message, i) => (
              <div key={i} className="rounded bg-gray-100 p-2">
                <span className="text-sm text-gray-600">{message.userId}:</span>{" "}
                {message.text}
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Page() {
  const [generation, setGeneration] = useState();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <Button
        onClick={async () => {
          setIsLoading(true);

          await fetch('/api/completion', {
            method: 'POST',
            body: JSON.stringify({
              prompt: 'There are several broken bricks in the sidewalk at 12 Greenwich Park, Roxbury, MA. The bricks are lifting up and pose a tripping hazard. I tripped and injured my knee and leg.',
            }),
          }).then(response => {
            response.json().then(json => {
              setGeneration(json);
              setIsLoading(false);
            });
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
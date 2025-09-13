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

          await fetch('/api/ranking', {
            method: 'POST',
            body: JSON.stringify({
              prompt: 'There are several broken bricks in the sidewalk at 12 Greenwich Park, Roxbury, MA. The bricks are lifting up and pose a tripping hazard. I tripped and injured my knee and leg.',
              report1: {
                street_address: '12 Greenwich Park, Roxbury, MA',
                coordinates: [42.3317, -71.0653],
                images: 'https://www.google.com/images/search?q=broken+bricks+in+sidewalk',
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
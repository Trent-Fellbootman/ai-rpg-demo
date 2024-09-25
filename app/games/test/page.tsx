"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [events, setEvents] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const eventSource = new EventSource("/api/generate-next-scene");

    eventSource.onmessage = (event) => {
      setCount((prevCount) => prevCount + 1); // Use functional update
      setEvents((prevEvents) => [...prevEvents, event.data]); // Create a new array
      eventSource.close(); // effectively close the stream after the first event
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <p>{count} Events:</p>
      <ul>
        {events.map((event, index) => (
          <li key={index}>{event}</li>
        ))}
      </ul>
    </div>
  );
}

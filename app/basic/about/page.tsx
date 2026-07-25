'use client';

import { useState } from 'react';
import { Button } from 'antd';

export default function About() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="App">
        <Button type="primary">Button</Button>
      </div>
      <h1>treez - About</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>app/basic/about/page.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  );
}

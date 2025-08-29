import React, { useState, useEffect } from 'react';
import PerfectMobileDashboard from './mobileDashboard';
import Dashboard from './Dashboard';

const ResponsiveDashboard = () => {
  const [screenSize, setScreenSize] = useState('mobile');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    // correr uma vez no mount
    handleResize();

    // adicionar listener
    window.addEventListener('resize', handleResize);

    // cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (screenSize === 'tablet') {
    return (
      <div className="max-w-3xl mx-auto">
        <PerfectMobileDashboard />
      </div>
    );
  }

  if (screenSize === 'mobile') {
    return <PerfectMobileDashboard />;
  }

  return <Dashboard />;
};

export default ResponsiveDashboard;

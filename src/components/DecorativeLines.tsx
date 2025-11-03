// src/components/DecorativeLines.tsx

import curveImage from '/bottom-left-curve.png';

const DecorativeLines = () => {
  return (
    <div className="fixed bottom-0 left-0 pointer-events-none z-0">
      <img 
        src={curveImage} 
        alt="" 
        style={{ maxWidth: '600px', height: 'auto', opacity: 0.2 }}
      />
    </div>
  );
};

export default DecorativeLines;
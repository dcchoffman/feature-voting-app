import React, { useState, useEffect } from "react";
// ✅ Correct - this imports the default export
import FeatureVotingSystem from './components/FeatureVotingSystem'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <FeatureVotingSystem defaultVotesPerUser={10} adminMode={false} />
    </div>
  );
}

export default App;
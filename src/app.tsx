import FeatureVotingSystem from './components/FeatureVotingSystem'
import './App.css'

function App() {
  return (
    <div className="App">
      <FeatureVotingSystem defaultVotesPerUser={10} adminMode={false} />
    </div>
  )
}

export default App
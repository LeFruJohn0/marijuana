import { useState } from 'react';
import { isEnvBrowser } from './utils/misc';
import { useNuiEvent } from './hooks/useNuiEvent';

function App() {
  const [visible, setVisible] = useState(isEnvBrowser()) // show if running in browser
  const [stage, setStage] = useState<number | null>(null)
  const [watered, setWatered] = useState<boolean | null>(null)

  useNuiEvent('update', (data: {stage?: number, watered?: boolean}) => {
    setStage(data.stage || null)
    setWatered(data.watered || false)
    setVisible(true)
  })

  useNuiEvent('clear', () => {
    setStage(null)
    setWatered(null)
    setVisible(false)
  })

  return (
    <>
      {visible && (
        <div className="scanner-wrapper">
          <div className="scanner-box">
            <h2>Plant Stats</h2>
            <p>Stage: {stage !== null ? `${stage}` : '--'}</p>
            <p>Watered: {`${watered}`}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default App

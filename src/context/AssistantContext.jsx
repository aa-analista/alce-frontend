import { createContext, useContext, useState, useCallback } from 'react'

const AssistantContext = createContext(null)

export const AssistantProvider = ({ children }) => {
  const [lastAction, setLastAction] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Dispatches an action from the AI so modules can react to it
  const dispatchAction = useCallback((action, data) => {
    setLastAction({ action, data, timestamp: Date.now() })
  }, [])

  const value = {
    lastAction,
    dispatchAction,
    isProcessing,
    setIsProcessing
  }

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  )
}

export const useAssistant = () => {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider')
  }
  return context
}

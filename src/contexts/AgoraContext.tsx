import React, { createContext, useContext, ReactNode } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { RTCClient } from '../agoraHelper';

// Create the context with default value
interface AgoraContextType {
  client: RTCClient;
}

const AgoraContext = createContext<AgoraContextType | undefined>(undefined);

// Create a provider component
interface AgoraProviderProps {
  children: ReactNode;
}

export const AgoraProvider: React.FC<AgoraProviderProps> = ({ children }) => {
  // Initialize the Agora client
  const client: RTCClient = AgoraRTC.createClient({
    mode: 'rtc',
    codec: 'vp8',
  }) as RTCClient;

  return <AgoraContext.Provider value={{ client }}>{children}</AgoraContext.Provider>;
};

// Create a custom hook to use the context
export const useAgora = (): AgoraContextType => {
  const context = useContext(AgoraContext);
  if (context === undefined) {
    throw new Error('useAgora must be used within an AgoraProvider');
  }
  return context;
};

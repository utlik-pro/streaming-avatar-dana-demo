import { useState, useRef, useEffect } from 'react';
import { RTCClient, sendMessageToAvatar, interruptResponse } from '../../agoraHelper';
import './styles.css';

interface Message {
  id: string;
  text: string;
  isSentByMe: boolean;
}

interface ChatInterfaceProps {
  client: RTCClient;
  connected: boolean;
  messageIds: string[];
  setMessageIds: React.Dispatch<React.SetStateAction<string[]>>;
  messageMap: Map<string, Message>;
  setMessageMap: React.Dispatch<React.SetStateAction<Map<string, Message>>>;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  toggleMic?: () => Promise<void>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  client,
  connected,
  messageIds,
  setMessageIds,
  messageMap,
  setMessageMap,
  micEnabled,
  setMicEnabled,
  toggleMic,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messageIds]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !connected) return;

    setSending(true);
    const messageId = Date.now().toString();
    setMessageIds((prev) => [...prev, messageId]);
    setMessageMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, {
        id: messageId,
        text: inputMessage,
        isSentByMe: true,
      });
      return newMap;
    });

    await sendMessageToAvatar(client, messageId, inputMessage);
    setInputMessage('');
    setSending(false);
  };

  const toggleMicInternal = async () => {
    if (toggleMic) {
      await toggleMic();
      return;
    }

    // Fallback implementation if toggleMic is not provided
    if (!micEnabled) {
      // Implementation removed as it's now handled by the useAudioControls hook
      setMicEnabled(true);
    } else {
      // Implementation removed as it's now handled by the useAudioControls hook
      setMicEnabled(false);
    }
    console.log(`Microphone is now ${micEnabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messageIds.map((id) => {
          const message = messageMap.get(id);
          if (!message) return null;
          return (
            <div
              key={id}
              className={`chat-message ${message.isSentByMe ? 'sent' : 'received'}`}
            >
              {message.text}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <button
          onClick={toggleMicInternal}
          disabled={sending || !connected}
          className={`icon-button ${sending || !connected ? 'disabled' : ''}`}
          title={micEnabled ? 'Disable microphone' : 'Enable microphone'}
        >
          <span className="material-icons">{micEnabled ? 'mic' : 'mic_off'}</span>
        </button>
        {!micEnabled && (
          <>
            <input
              type="text"
              placeholder={'Type a message...'}
              disabled={sending || !connected}
              className={sending || !connected ? 'disabled' : ''}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !connected}
              className={`icon-button ${sending || !connected ? 'disabled' : ''}`}
              title="Send message"
            >
              <span className="material-icons">send</span>
            </button>
            <button
              onClick={() => interruptResponse(client)}
              disabled={sending || !connected}
              className={`icon-button ${sending || !connected ? 'disabled' : ''}`}
              title="Interrupt response"
            >
              <span className="material-icons">stop</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;

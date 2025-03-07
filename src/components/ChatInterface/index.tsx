import { useState, useRef, useEffect } from 'react';
import { RTCClient, sendMessageToAvatar, interruptResponse } from '../../agoraHelper';
import AgoraRTC, { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
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
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  let audioTrack: IMicrophoneAudioTrack | null;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageIds, messageMap]);

  const sendMessage = async () => {
    setSending(true);

    const messageId = `msg-${Date.now()}`;
    const msg = {
      id: messageId,
      text: inputMessage,
      isSentByMe: true,
    };

    setMessageIds((prevMessages: string[]) => [...prevMessages, msg.id]);
    setMessageMap((prev: Map<string, Message>) => {
      const newMap = new Map(prev);
      newMap.set(messageId, msg);
      return newMap;
    });

    await sendMessageToAvatar(client, messageId, inputMessage);

    setInputMessage('');
    setSending(false);
  };

  const toggleMic = async () => {
    if (!micEnabled) {
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_low_quality',
        AEC: true,
        ANS: true,
        AGC: true,
      });
      await client.publish(audioTrack);
      setMicEnabled(true);
    } else {
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
        await client.unpublish(audioTrack);
        audioTrack = null;
      }
      setMicEnabled(false);
    }
    console.log(`Microphone is now ${micEnabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messageIds.map((id: string, index: number) => {
          const message = messageMap.get(id)!;
          return (
            <div key={index} className={`chat-message ${message.isSentByMe ? 'sent' : 'received'}`}>
              {message.text}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <button
          onClick={toggleMic}
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

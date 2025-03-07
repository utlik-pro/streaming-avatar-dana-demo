import { useState, useRef, useEffect } from 'react';
import './App.css';
import AgoraRTC, { IAgoraRTCRemoteUser, IMicrophoneAudioTrack, NetworkQuality } from 'agora-rtc-sdk-ng';
import { UID } from 'agora-rtc-sdk-ng/esm';
import { Session, ApiService, Credentials } from './apiService';

import {
  RTCClient,
  sendMessageToAvatar,
  setAvatarParams,
  interruptResponse,
  log,
  StreamMessage,
  ChatResponsePayload,
  CommandResponsePayload,
} from './agoraHelper';

import ConfigurationPanel from './components/ConfigurationPanel';
import NetworkQualityDisplay, { NetworkStats } from './components/NetworkQuality';
import VideoDisplay from './components/VideoDisplay';

const client: RTCClient = AgoraRTC.createClient({
  mode: 'rtc',
  codec: 'vp8',
}) as RTCClient;

let audioTrack: IMicrophoneAudioTrack | null;

// let uid: UID = 0;

function App() {
  const [isJoined, setIsJoined] = useState(false);

  const joinChannel = async (credentials: Credentials) => {
    const { agora_app_id, agora_channel, agora_token, agora_uid } = credentials;

    if (isJoined) {
      await leaveChannel();
    }

    client.on('exception', onException);
    client.on('user-published', onUserPublish);
    client.on('user-unpublished', onUserUnpublish);
    client.on('token-privilege-will-expire', onTokenWillExpire);
    client.on('token-privilege-did-expire', onTokenDidExpire);

    await client.join(agora_app_id, agora_channel, agora_token, agora_uid);

    client.on('network-quality', (stats: NetworkQuality) => {
      // Update remote stats
      const videoStats = client.getRemoteVideoStats();
      const audioStats = client.getRemoteAudioStats();
      const networkStats = client.getRemoteNetworkQuality();

      // Get the first remote user's stats
      const firstVideoStats = Object.values(videoStats)[0] || {};
      const firstAudioStats = Object.values(audioStats)[0] || {};
      const firstNetworkStats = Object.values(networkStats)[0] || {};

      setRemoteStats({
        localNetwork: stats,
        remoteNetwork: firstNetworkStats,
        video: firstVideoStats,
        audio: firstAudioStats,
      });
    });

    setIsJoined(true);
  };

  const onException = (e: { code: number; msg: string; uid: UID }) => {
    log(e);
  };

  const onTokenWillExpire = () => {
    alert('Session will expire in 30s');
  };

  const onTokenDidExpire = () => {
    alert('Session expired');
    closeStreaming();
  };

  const leaveChannel = async () => {
    setIsJoined(false);

    if (audioTrack) {
      await client.unpublish(audioTrack);
      audioTrack = null;
    }

    await client.unpublish();
    await client.leave();

    client.removeAllListeners('network-quality');
    client.removeAllListeners('exception');
    client.removeAllListeners('user-published');
    client.removeAllListeners('user-unpublished');
    client.removeAllListeners('token-privilege-will-expire');
    client.removeAllListeners('token-privilege-did-expire');
  };

  const onUserPublish = async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio' | 'datachannel') => {
    log('onUserPublish', user, mediaType);
    if (mediaType === 'video') {
      const remoteTrack = await client.subscribe(user, mediaType);
      remoteTrack.play('remote-video');
    } else if (mediaType === 'audio') {
      const remoteTrack = await client.subscribe(user, mediaType);
      remoteTrack.play();
    }
  };

  const onUserUnpublish = async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio' | 'datachannel') => {
    log('onUserUnpublish', user, mediaType);
    await client.unsubscribe(user, mediaType);
  };

  interface Message {
    id: string;
    text: string;
    isSentByMe: boolean;
  }

  const [messageMap, setMessageMap] = useState<Map<string, Message>>(new Map());
  const [messageIds, setMessageIds] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);

  const [modeType, setModeType] = useState(2);
  const [language, setLanguage] = useState('en');
  const [voiceId, setVoiceId] = useState('Xb7hH8MSUJpSbSDYk0k2');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');

  const [openapiHost, setOpenapiHost] = useState('https://openapi.akool.com');
  const [avatarId, setAvatarId] = useState('dvp_Tristan_cloth2_1080P');
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(
    'https://static.website-files.org/assets/avatar/avatar/streaming_avatar/tristan_10s_silence.mp4',
  );
  const [openapiToken, setOpenapiToken] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [api, setApi] = useState<ApiService | null>();

  useEffect(() => {
    if (openapiHost && openapiToken) {
      const apiService = new ApiService(openapiHost, openapiToken);
      setApi(apiService);
    } else {
      setApi(null);
    }
  }, [openapiHost, openapiToken]);

  useEffect(() => {
    if (connected) {
      setAvatarParams(client, {
        vid: voiceId,
        lang: language,
        mode: modeType,
        bgurl: backgroundUrl,
        vurl: voiceUrl,
      }).catch((error) => {
        console.error('Failed to update avatar params:', error);
      });
    }
  }, [connected, language, voiceId, modeType, backgroundUrl, voiceUrl]);

  const [sessionDuration, setSessionDuration] = useState(10);

  const startStreaming = async () => {
    if (!api) {
      alert('Please set host and token first');
      return;
    }

    const data = await api.createSession({
      avatar_id: avatarId,
      duration: sessionDuration * 60,
    });
    log(data);
    setSession(data);

    const { credentials } = data;

    await joinChannel(credentials);
    await joinChat();
  };

  const closeStreaming = async () => {
    await leaveChat();
    await leaveChannel();
    if (!session) {
      log('session not found');
      return;
    }
    await api?.closeSession(session._id);
  };

  const joinChat = async () => {
    client.on('stream-message', onStreamMessage);

    setConnected(true);

    await setAvatarParams(client, {
      vid: voiceId,
      lang: language,
      mode: modeType,
    });
  };

  const leaveChat = async () => {
    client.removeAllListeners('stream-message');

    setMicEnabled(false);
    setConnected(false);
    setMessageIds([]);
    setMessageMap(new Map());
  };

  const onStreamMessage = (uid: UID, body: Uint8Array) => {
    const msg = new TextDecoder().decode(body);
    log(`stream-message, uid=${uid}, size=${body.length}, msg=${msg}`);
    const { v, type, mid, pld } = JSON.parse(msg) as StreamMessage;
    if (v !== 2) {
      log(`unsupported message version, v=${v}`);
      return;
    }
    if (type === 'chat') {
      const { text, from } = pld as ChatResponsePayload;
      setMessageMap((prev) => {
        const msg_id = `${type}_${mid}`;
        const newMap = new Map(prev);
        if (!newMap.has(msg_id)) {
          const msg = {
            id: msg_id,
            text,
            isSentByMe: from === 'user',
          };
          newMap.set(msg_id, msg);
          setMessageIds((prevMessages) => {
            if (!prevMessages.includes(msg_id)) {
              return [...prevMessages, msg_id];
            }
            return prevMessages;
          });
        } else {
          const msg = newMap.get(msg_id);
          if (msg) {
            msg.text += text;
            newMap.set(msg_id, msg);
          }
        }
        return newMap;
      });
    } else if (type === 'cmd') {
      const { cmd, code, msg } = pld as CommandResponsePayload;
      log(`cmd-response, cmd=${cmd}, code=${code}, msg=${msg}`);
      if (code !== 1000) {
        alert(`cmd-response, cmd=${cmd}, code=${code}, msg=${msg}`);
      }
    }
  };

  const sendMessage = async () => {
    setSending(true);

    const messageId = `msg-${Date.now()}`;
    const msg = {
      id: messageId,
      text: inputMessage,
      isSentByMe: true,
    };

    setMessageIds((prevMessages) => [...prevMessages, msg.id]);
    setMessageMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, msg);
      return newMap;
    });

    /*
      If you need to utilize your own LLM service, perform an HTTP request here.
      Send the "inputMessage" to your backend and retrieve the response.

      Example:
      
      // Set mode to 1 to repeat mode, and you only need to do this once.
      setAvatarParams(client, {
        mode: 1,
      });

      try {
        const response = await fetch('https://your-backend-host/api/llm/answer', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: inputMessage,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          inputMessage = result.answer;
        } else {
          console.error("Failed to fetch from backend", response.statusText);
        }
      } catch (error) {
        console.error("Error during fetch operation", error);
      }
    */

    await sendMessageToAvatar(client, messageId, inputMessage);

    setInputMessage('');
    setSending(false);
  };

  const toggleMic = async () => {
    if (!audioTrack) {
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_low_quality',
        AEC: true,
        ANS: true,
        AGC: true,
      });
      await client.publish(audioTrack);
      setMicEnabled(true);
    } else {
      audioTrack.stop();
      audioTrack.close();
      await client.unpublish(audioTrack);
      audioTrack = null;
      setMicEnabled(false);
    }
    log(`Microphone is now ${audioTrack ? 'enabled' : 'disabled'}`);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageIds, messageMap]);

  const [remoteStats, setRemoteStats] = useState<NetworkStats | null>(null);

  return (
    <>
      <ConfigurationPanel
        openapiHost={openapiHost}
        setOpenapiHost={setOpenapiHost}
        openapiToken={openapiToken}
        setOpenapiToken={setOpenapiToken}
        sessionDuration={sessionDuration}
        setSessionDuration={setSessionDuration}
        modeType={modeType}
        setModeType={setModeType}
        avatarId={avatarId}
        setAvatarId={setAvatarId}
        language={language}
        setLanguage={setLanguage}
        voiceId={voiceId}
        setVoiceId={setVoiceId}
        voiceUrl={voiceUrl}
        setVoiceUrl={setVoiceUrl}
        backgroundUrl={backgroundUrl}
        setBackgroundUrl={setBackgroundUrl}
        isJoined={isJoined}
        startStreaming={startStreaming}
        closeStreaming={closeStreaming}
        api={api}
        setAvatarVideoUrl={setAvatarVideoUrl}
      />
      <div className="right-side">
        <VideoDisplay isJoined={isJoined} avatarVideoUrl={avatarVideoUrl} />
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
        <div>{isJoined && remoteStats && <NetworkQualityDisplay stats={remoteStats} />}</div>
      </div>
    </>
  );
}

export default App;

import { useState } from 'react';
import AgoraRTC, { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { useAgora } from '../contexts/AgoraContext';

export const useAudioControls = () => {
  const { client } = useAgora();
  const [micEnabled, setMicEnabled] = useState(false);
  let audioTrack: IMicrophoneAudioTrack | null = null;

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

  return {
    micEnabled,
    setMicEnabled,
    toggleMic,
  };
};

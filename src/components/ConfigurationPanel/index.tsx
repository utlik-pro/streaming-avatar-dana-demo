import { useState, useEffect } from 'react';
import { ApiService, Language, Voice, Avatar } from '../../apiService';
import AvatarSelector from '../AvatarSelector';
import './styles.css';

interface ConfigurationPanelProps {
  api: ApiService | null | undefined;
  openapiHost: string;
  setOpenapiHost: (host: string) => void;
  openapiToken: string;
  setOpenapiToken: (token: string) => void;
  sessionDuration: number;
  setSessionDuration: (duration: number) => void;
  modeType: number;
  setModeType: (mode: number) => void;
  avatarId: string;
  setAvatarId: (id: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  voiceId: string;
  setVoiceId: (id: string) => void;
  voiceUrl: string;
  setVoiceUrl: (url: string) => void;
  backgroundUrl: string;
  setBackgroundUrl: (url: string) => void;
  isJoined: boolean;
  startStreaming: () => Promise<void>;
  closeStreaming: () => Promise<void>;
  setAvatarVideoUrl: (url: string) => void;
}

export default function ConfigurationPanel({
  api,
  openapiHost,
  setOpenapiHost,
  openapiToken,
  setOpenapiToken,
  sessionDuration,
  setSessionDuration,
  modeType,
  setModeType,
  avatarId,
  setAvatarId,
  language,
  setLanguage,
  voiceId,
  setVoiceId,
  voiceUrl,
  setVoiceUrl,
  backgroundUrl,
  setBackgroundUrl,
  isJoined,
  startStreaming,
  closeStreaming,
  setAvatarVideoUrl,
}: ConfigurationPanelProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [useManualVoiceId, setUseManualVoiceId] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!api) return;
      try {
        const [langList, voiceList, avatarList] = await Promise.all([
          api.getLangList(),
          api.getVoiceList(),
          api.getAvatarList(),
        ]);
        setLanguages(langList);
        setVoices(voiceList);
        setAvatars(avatarList);
      } catch (error) {
        console.error('Error fetching language and voice data:', error);
      }
    };

    fetchData();
  }, [api]);

  return (
    <div className="left-side">
      <h3>Streaming Avatar Demo</h3>
      <div>
        <label>
          Host:
          <input defaultValue={openapiHost} onChange={(e) => setOpenapiHost(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Token:
          <input defaultValue={openapiToken} onChange={(e) => setOpenapiToken(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Session Duration (minutes):
          <input
            type="number"
            min="1"
            max="60"
            value={sessionDuration}
            onChange={(e) => setSessionDuration(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </label>
      </div>
      <div>
        <label>
          ModeType:
          <select value={modeType} onChange={(e) => setModeType(parseInt(e.target.value))}>
            <option value="1">Repeat</option>
            <option value="2">Dialogue</option>
          </select>
        </label>
      </div>
      <AvatarSelector
        api={api}
        avatarId={avatarId}
        setAvatarId={setAvatarId}
        avatars={avatars}
        setAvatars={setAvatars}
        setAvatarVideoUrl={setAvatarVideoUrl}
      />
      <div>
        <label>
          Language:
          <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!languages.length}>
            <option value="">Select a language</option>
            {languages.map((lang) => (
              <option key={lang.lang_code} value={lang.lang_code}>
                {lang.lang_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label>
          Voice:
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!useManualVoiceId ? (
              <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} disabled={!voices.length}>
                <option value="">Select a voice</option>
                {voices.map((voice, index) => (
                  <option key={index} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="Enter voice ID"
              />
            )}
            <button
              onClick={() => setUseManualVoiceId(!useManualVoiceId)}
              className="icon-button"
              title={useManualVoiceId ? 'Switch to dropdown' : 'Switch to manual input'}
            >
              <span className="material-icons">{useManualVoiceId ? 'list' : 'edit'}</span>
            </button>
          </div>
        </label>
      </div>
      <div>
        <label>
          Voice URL:
          <input
            type="text"
            value={voiceUrl}
            onChange={(e) => setVoiceUrl(e.target.value)}
            placeholder="Enter voice URL"
          />
        </label>
      </div>
      <div>
        <label>
          Background URL:
          <input
            type="text"
            value={backgroundUrl}
            onChange={(e) => setBackgroundUrl(e.target.value)}
            placeholder="Enter background image/video URL"
          />
        </label>
      </div>
      <div className="buttons">
        {isJoined ? (
          <button onClick={closeStreaming} className="button-off">
            Close Streaming
          </button>
        ) : (
          <button onClick={startStreaming} className="button-on">
            Start Streaming
          </button>
        )}
      </div>
    </div>
  );
}

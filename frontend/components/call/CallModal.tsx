import { useState, useEffect } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
    VideoTrack,
    AudioTrack,
    useLocalParticipant,
    TrackToggle,
    DisconnectButton,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import styles from '../../styles/CallModal.module.css';
import { ActiveCall } from '@/types/call';

interface CallModalProps {
    call: ActiveCall;
    onEnd: () => void;
}

function CallInterface({ onEnd }: { onEnd: () => void }) {
    const participants = useParticipants();
    const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
    const { localParticipant } = useLocalParticipant();

    const videoTracks = tracks.filter(track => track.source === Track.Source.Camera);
    const remoteVideoTracks = videoTracks.filter(track => track.participant.identity !== localParticipant.identity);
    const localVideoTrack = videoTracks.find(track => track.participant.identity === localParticipant.identity);

    return (
        <div className={styles.callInterface}>
            {/* Main video area */}
            <div className={styles.videoGrid}>
                {remoteVideoTracks.length > 0 ? (
                    remoteVideoTracks.map((track) => (
                        <div key={track.participant.identity} className={styles.videoContainer}>
                            <VideoTrack trackRef={track} className={styles.videoElement} />
                            <div className={styles.participantName}>
                                {track.participant.name || track.participant.identity}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.waitingMessage}>
                        <div className={styles.waitingIcon}>📞</div>
                        <p>Waiting for others to join...</p>
                    </div>
                )}
            </div>

            {/* Local video (picture-in-picture) */}
            {localVideoTrack && (
                <div className={styles.localVideo}>
                    <VideoTrack trackRef={localVideoTrack} className={styles.localVideoElement} />
                    <div className={styles.localLabel}>You</div>
                </div>
            )}

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.controlsInner}>
                    <TrackToggle source={Track.Source.Microphone} className={styles.controlButton}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </TrackToggle>

                    <TrackToggle source={Track.Source.Camera} className={styles.controlButton}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 7l-7 5 7 5V7z"></path>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                    </TrackToggle>

                    <button onClick={onEnd} className={`${styles.controlButton} ${styles.endCallButton}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <RoomAudioRenderer />
        </div>
    );
}

export default function CallModal({ call, onEnd }: CallModalProps) {
    const [isConnected, setIsConnected] = useState(false);

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.callContainer}>
                <LiveKitRoom
                    serverUrl={call.url}
                    token={call.token}
                    connect={true}
                    audio={true}
                    video={true}
                    onConnected={() => setIsConnected(true)}
                    onDisconnected={() => {
                        setIsConnected(false);
                        onEnd();
                    }}
                    className={styles.liveKitRoom}
                >
                    {isConnected ? (
                        <CallInterface onEnd={onEnd} />
                    ) : (
                        <div className={styles.connecting}>
                            <div className={styles.spinner}></div>
                            <p>Connecting to call...</p>
                        </div>
                    )}
                </LiveKitRoom>
            </div>
        </div>
    );
}

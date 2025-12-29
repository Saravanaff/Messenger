import { IncomingCall } from '@/types/call';
import styles from '../../styles/CallModal.module.css';

interface IncomingCallModalProps {
    call: IncomingCall;
    onAccept: () => void;
    onReject: () => void;
}

export default function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
    return (
        <div className={styles.incomingCallOverlay}>
            <div className={styles.incomingCallModal}>
                <div className={styles.incomingCallIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </div>

                <h3 className={styles.incomingCallTitle}>Incoming Call</h3>
                <p className={styles.incomingCallFrom}>
                    {call.initiator.username} is calling...
                </p>
                <p className={styles.incomingCallType}>
                    {call.type === 'conversation' ? 'Direct Call' :
                        call.type === 'group' ? 'Group Call' : 'Room Call'}
                </p>

                <div className={styles.incomingCallActions}>
                    <button
                        className={`${styles.callActionButton} ${styles.rejectButton}`}
                        onClick={onReject}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 1L1 23M1 1l22 22" />
                        </svg>
                        Reject
                    </button>
                    <button
                        className={`${styles.callActionButton} ${styles.acceptButton}`}
                        onClick={onAccept}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}

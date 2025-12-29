import React from 'react';
import styles from './TypingIndicator.module.css';

interface TypingIndicatorProps {
    username?: string;
    isGroup?: boolean;
}

export default function TypingIndicator({ username, isGroup }: TypingIndicatorProps) {
    return (
        <div className={styles.typingIndicator}>
            <span className={styles.typingText}>
                {username ? `${username} is typing` : 'Typing'}
            </span>
            <div className={styles.typingDots}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
            </div>
        </div>
    );
}

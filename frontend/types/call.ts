export type CallType = 'conversation' | 'group' | 'room';

export type CallState = 'idle' | 'initiating' | 'ringing' | 'active' | 'ended';

export interface CallParticipant {
    id: number;
    username: string;
}

export interface IncomingCall {
    roomName: string;
    type: CallType;
    targetId: number;
    initiator: CallParticipant;
}

export interface ActiveCall {
    roomName: string;
    token: string;
    url: string;
    type: CallType;
    targetId: number;
    participants: CallParticipant[];
}

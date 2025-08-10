export type Stamp = {
        date: string;
        lectureName: string | null;
        iconUrl: string | null;
};

export type SessionUser = {
        id: string;
        username: string;
};

export type SessionData = {
        user: SessionUser;
        stamps: Stamp[];
};

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Demo credentials for college presentation
const VALID_USERS = [
    { username: 'admin', password: 'nexus2026', role: 'Admin' },
    { username: 'demo', password: 'demo', role: 'Viewer' },
];

function getInitialUser() {
    const stored = localStorage.getItem('nexus_auth');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            localStorage.removeItem('nexus_auth');
        }
    }
    return null;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(getInitialUser);

    const login = (username, password) => {
        const found = VALID_USERS.find(
            u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        );
        if (found) {
            const userData = { username: found.username, role: found.role };
            setUser(userData);
            localStorage.setItem('nexus_auth', JSON.stringify(userData));
            return { success: true };
        }
        return { success: false, error: 'Invalid credentials' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('nexus_auth');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading: false }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

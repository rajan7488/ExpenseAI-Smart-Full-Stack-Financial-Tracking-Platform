import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import API from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const init = async () => {
            const savedToken = localStorage.getItem("token");
            if (!savedToken) {
                setLoading(false);
                return;
            }
            try {
                API.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
                const res = await API.get("/profile");
                setUser(res.data);
                setLoading(false); // ✅ batched together with setUser

            } catch (err) {
                localStorage.removeItem("token");
                delete API.defaults.headers.common["Authorization"];
                if (isMounted.current) setLoading(false); // ✅ only in catch
            }
        };
        init();
    }, []);

    const loginAction = useCallback((userData, tokenString) => {
        localStorage.setItem("token", tokenString);
        Object.keys(localStorage)
            .filter(k => k.startsWith("aiInsights") || k.startsWith("seenBadges"))
            .forEach(k => localStorage.removeItem(k));
        API.defaults.headers.common["Authorization"] = `Bearer ${tokenString}`;
        setToken(tokenString);
        setUser(userData);
        setLoading(false);
    }, []);

    const logoutAction = useCallback(() => {
        localStorage.removeItem("token");
        Object.keys(localStorage)
            .filter(k => k.startsWith("aiInsights") || k.startsWith("seenBadges"))
            .forEach(k => localStorage.removeItem(k));
        delete API.defaults.headers.common["Authorization"];
        setToken(null);
        setUser(null);
        window.location.href = "/login";
    }, []);

    const updateUser = useCallback((patch) => {
        setUser(prev => prev ? { ...prev, ...patch } : prev);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const res = await API.get("/profile");
            if (isMounted.current) setUser(res.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            loginAction, logoutAction,
            updateUser, refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
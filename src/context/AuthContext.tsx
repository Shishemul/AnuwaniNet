import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DataService } from '../services/dataService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (usernameOrEmail: string, password?: string) => { success: boolean; message: string };
  register: (userData: {
    username: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
  }) => { success: boolean; message: string };
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  toggleUserStatus: (userId: string) => void;
  deleteUser: (userId: string) => void;
  createUserByAdmin: (userData: Omit<User, 'id' | 'createdAt'>) => { success: boolean; message: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_AUTH_USER = 'anw_current_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => DataService.getUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Default to Superadmin for initial view so user sees full capabilities immediately
    const superadmin = DataService.getUsers().find(u => u.role === 'superadmin');
    return superadmin || null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_AUTH_USER);
    }
  }, [currentUser]);

  const login = (usernameOrEmail: string, _password?: string): { success: boolean; message: string } => {
    const freshUsers = DataService.getUsers();
    const cleanQuery = usernameOrEmail.trim().toLowerCase();
    
    const found = freshUsers.find(
      u => u.username.toLowerCase() === cleanQuery || u.email.toLowerCase() === cleanQuery
    );

    if (!found) {
      return { success: false, message: 'Pengguna tidak ditemukan. Cek username atau email Anda.' };
    }

    if (found.status === 'suspended') {
      return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Administrator.' };
    }

    const updated = {
      ...found,
      lastLogin: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    };

    DataService.updateUser(updated);
    setCurrentUser(updated);
    setUsers(DataService.getUsers());

    return { success: true, message: `Selamat datang kembali, ${found.name} (${found.role})!` };
  };

  const register = (userData: {
    username: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
  }): { success: boolean; message: string } => {
    const freshUsers = DataService.getUsers();
    const exists = freshUsers.some(
      u => u.username.toLowerCase() === userData.username.toLowerCase() || u.email.toLowerCase() === userData.email.toLowerCase()
    );

    if (exists) {
      return { success: false, message: 'Username atau Email sudah terdaftar!' };
    }

    const newUser: User = {
      id: 'usr-' + Date.now(),
      username: userData.username.trim(),
      name: userData.name.trim(),
      email: userData.email.trim(),
      phone: userData.phone.trim(),
      role: userData.role || 'pelanggan',
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    };

    freshUsers.push(newUser);
    DataService.saveUsers(freshUsers);
    setUsers(freshUsers);
    setCurrentUser(newUser);

    return { success: true, message: 'Pendaftaran berhasil! Anda telah masuk sebagai ' + newUser.name };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (targetRole: UserRole) => {
    // Keamanan: Pengguna tidak bisa ganti role tanpa login
    if (!currentUser) {
      console.warn('Ditolak: Tidak bisa mengganti role tanpa login terlebih dahulu.');
      return;
    }
    // Hanya Superadmin yang berwenang beralih persona demonstrasi
    if (currentUser.role !== 'superadmin' && currentUser.role !== targetRole) {
      console.warn('Ditolak: Hanya Superadmin terotentikasi yang dapat meninjau peran lain.');
      return;
    }
    const freshUsers = DataService.getUsers();
    const targetUser = freshUsers.find(u => u.role === targetRole);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    const freshUsers = DataService.getUsers();
    const target = freshUsers.find(u => u.id === userId);
    if (target) {
      target.role = newRole;
      DataService.saveUsers(freshUsers);
      setUsers([...freshUsers]);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...target });
      }
    }
  };

  const toggleUserStatus = (userId: string) => {
    const freshUsers = DataService.getUsers();
    const target = freshUsers.find(u => u.id === userId);
    if (target) {
      target.status = target.status === 'active' ? 'suspended' : 'active';
      DataService.saveUsers(freshUsers);
      setUsers([...freshUsers]);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...target });
      }
    }
  };

  const deleteUser = (userId: string) => {
    DataService.deleteUser(userId);
    setUsers(DataService.getUsers());
  };

  const createUserByAdmin = (userData: Omit<User, 'id' | 'createdAt'>): { success: boolean; message: string } => {
    const freshUsers = DataService.getUsers();
    const exists = freshUsers.some(
      u => u.username.toLowerCase() === userData.username.toLowerCase() || u.email.toLowerCase() === userData.email.toLowerCase()
    );
    if (exists) {
      return { success: false, message: 'Username atau Email sudah dipakai!' };
    }

    const newUser: User = {
      ...userData,
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    freshUsers.push(newUser);
    DataService.saveUsers(freshUsers);
    setUsers(freshUsers);
    return { success: true, message: `User ${newUser.name} (${newUser.role}) berhasil ditambahkan!` };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        register,
        logout,
        switchRole,
        updateUserRole,
        toggleUserStatus,
        deleteUser,
        createUserByAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

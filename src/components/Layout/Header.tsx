import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { profile, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CalTrack</h1>
              <p className="text-xs text-gray-500">Suivi calorique personnalisé</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{profile.email}</span>
              </div>
            )}

            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

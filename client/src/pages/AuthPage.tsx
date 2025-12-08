import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left side - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <p className="text-blue-500 font-medium mb-1">
                {isSignUp ? 'Get started with' : 'Welcome to'}
              </p>
              <h1 className="text-4xl font-bold text-blue-600">
                TaskCanvas
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create Account!' : 'Login Here!'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right side - Illustration */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50 items-center justify-center p-12">
          <div className="relative">
            {/* Decorative circles */}
            <div className="absolute -top-8 right-12 w-16 h-16 border-4 border-blue-300 rounded-full opacity-60"></div>
            <div className="absolute top-4 right-0 w-4 h-4 bg-blue-400 rounded-full"></div>
            <div className="absolute -top-4 left-20 w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="absolute top-20 -left-8 w-2 h-2 bg-blue-400 rounded-full"></div>

            {/* Main illustration */}
            <svg
              viewBox="0 0 400 300"
              className="w-full max-w-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background blob */}
              <ellipse cx="200" cy="180" rx="150" ry="100" fill="#E8F4FD" />

              {/* Desk */}
              <rect x="80" y="220" width="240" height="8" rx="4" fill="#CBD5E1" />

              {/* Plant pot */}
              <path d="M300 220 L310 180 L330 180 L340 220 Z" fill="#10B981" />
              <ellipse cx="320" cy="180" rx="15" ry="5" fill="#059669" />
              <path d="M320 180 Q310 140 325 120" stroke="#10B981" strokeWidth="6" fill="none" />
              <path d="M320 180 Q330 150 315 130" stroke="#10B981" strokeWidth="6" fill="none" />
              <path d="M320 180 Q340 160 335 135" stroke="#059669" strokeWidth="4" fill="none" />

              {/* Coffee cup */}
              <rect x="90" y="195" width="25" height="25" rx="3" fill="#F59E0B" />
              <ellipse cx="102" cy="195" rx="12" ry="3" fill="#D97706" />
              <path d="M115 200 Q125 205 115 215" stroke="#F59E0B" strokeWidth="3" fill="none" />

              {/* Person */}
              {/* Head */}
              <circle cx="220" cy="95" r="30" fill="#FECACA" />
              {/* Hair */}
              <path d="M190 85 Q190 60 220 55 Q250 60 250 85 Q245 75 220 75 Q195 75 190 85" fill="#1E293B" />
              <path d="M250 85 Q260 90 255 110" fill="#1E293B" />

              {/* Body */}
              <path d="M190 125 Q180 150 175 200 L195 200 L200 160 L220 170 L240 160 L245 200 L265 200 Q260 150 250 125 Q230 135 210 135 Q195 135 190 125" fill="#3B82F6" />

              {/* Arms */}
              <path d="M175 150 Q150 170 140 190 L150 195 Q160 175 180 160" fill="#FECACA" />
              <path d="M265 150 Q280 165 285 180" stroke="#FECACA" strokeWidth="15" strokeLinecap="round" fill="none" />

              {/* Laptop */}
              <rect x="130" y="175" width="100" height="65" rx="5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
              <rect x="135" y="180" width="90" height="50" rx="3" fill="#BFDBFE" />

              {/* Screen content - Eisenhower matrix */}
              <line x1="180" y1="185" x2="180" y2="225" stroke="#60A5FA" strokeWidth="1" />
              <line x1="140" y1="205" x2="220" y2="205" stroke="#60A5FA" strokeWidth="1" />
              <rect x="145" y="188" width="12" height="8" rx="1" fill="#EF4444" opacity="0.7" />
              <rect x="160" y="192" width="10" height="6" rx="1" fill="#EF4444" opacity="0.7" />
              <rect x="185" y="188" width="14" height="7" rx="1" fill="#F59E0B" opacity="0.7" />
              <rect x="145" y="210" width="11" height="7" rx="1" fill="#3B82F6" opacity="0.7" />
              <rect x="185" y="212" width="13" height="6" rx="1" fill="#10B981" opacity="0.7" />
              <rect x="200" y="218" width="8" height="5" rx="1" fill="#10B981" opacity="0.7" />

              {/* Floating elements */}
              <circle cx="290" cy="100" r="8" fill="#BFDBFE" />
              <circle cx="120" cy="120" r="5" fill="#93C5FD" />
              <circle cx="100" cy="90" r="3" fill="#60A5FA" />

              {/* Task cards floating */}
              <rect x="280" y="130" width="40" height="25" rx="4" fill="white" stroke="#E2E8F0" strokeWidth="1" />
              <rect x="285" y="138" width="20" height="3" rx="1" fill="#94A3B8" />
              <rect x="285" y="145" width="28" height="2" rx="1" fill="#CBD5E1" />

              <rect x="70" y="140" width="35" height="22" rx="4" fill="white" stroke="#E2E8F0" strokeWidth="1" />
              <rect x="75" y="147" width="18" height="3" rx="1" fill="#94A3B8" />
              <rect x="75" y="153" width="24" height="2" rx="1" fill="#CBD5E1" />
            </svg>

            {/* Decorative dots */}
            <div className="absolute bottom-20 left-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="absolute bottom-10 right-20 w-3 h-3 bg-blue-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

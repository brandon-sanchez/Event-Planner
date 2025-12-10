import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, githubProvider } from "../config/firebase";
import { GoogleLoginButton, GithubLoginButton } from "react-social-login-buttons";
import { createOrUpdateUserProfile } from "../services/userService";

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await createOrUpdateUserProfile({
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || email.split('@')[0],
        photoURL: userCredential.user.photoURL
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);

      await createOrUpdateUserProfile({
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignup = async () => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, githubProvider);

      await createOrUpdateUserProfile({
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-rose-500 mb-6 text-center">
            Event Planner
          </h1>
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Sign Up</h2>

          {error && (
            <div className="bg-rose-900/30 border border-rose-700 text-rose-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup}>
            <div className="mb-4">
              <label className="block text-slate-200 text-sm font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-slate-200 text-sm font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 text-white py-2 px-4 rounded-lg hover:bg-rose-600 disabled:bg-rose-400 font-semibold shadow-lg shadow-rose-900/40 transition-colors"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-400">Or sign up with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <GoogleLoginButton
                onClick={handleGoogleSignup}
                disabled={loading}
                className="provider-btn google"
              >
                <span>Google</span>
              </GoogleLoginButton>

              <GithubLoginButton
                onClick={handleGithubSignup}
                disabled={loading}
                className="provider-btn github"
              >
                <span>GitHub</span>
              </GithubLoginButton>
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-rose-300 hover:text-rose-200 hover:underline font-semibold"
            >
              Login
            </button>
          </p>
        </div>
      </div>
  )
}

export default Signup;

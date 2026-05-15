import { useNavigate } from 'react-router-dom';
import { Button }      from '@/components/ui/Button';
import { Home }        from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-6 text-center">
      <div className="space-y-2">
        <p className="text-8xl font-black text-indigo-600">404</p>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          The page you were looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button
        variant="primary"
        leftIcon={<Home size={16} />}
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </div>
  );
}

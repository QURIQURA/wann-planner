import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const signInGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card-flat p-8">
        <p className="label-caps text-muted-foreground">WANN</p>
        <h1 className="mt-1 text-2xl font-light tracking-tight">Weekly OS</h1>
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          A rotating weekly dashboard for a life running on multiple tracks.
        </p>
        <button
          onClick={signInGoogle}
          disabled={loading}
          className="mt-8 w-full border border-border py-3 label-caps hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

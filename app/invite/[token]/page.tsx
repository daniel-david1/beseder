"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface InviteInfo {
  brand_name: string;
  brand_emoji: string;
  invited_email: string;
  role: 'viewer' | 'editor';
  status: string;
  owner_user_id: string;
}

type PageState = 'loading' | 'ready' | 'accepting' | 'accepted' | 'error' | 'already_accepted' | 'own_brand';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : '';

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [acceptedBrandId, setAcceptedBrandId] = useState<string | null>(null);

  useEffect(() => {
    // Check login state
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    // Load invite info
    fetch(`/api/team/accept?token=${token}`)
      .then(res => res.json())
      .then((data: unknown) => {
        const d = data as { error?: string } & Partial<InviteInfo>;
        if (d.error) {
          if (d.error === 'not_found') {
            setErrorMsg('ההזמנה לא נמצאה או שפגה תוקפה');
          } else {
            setErrorMsg(d.error);
          }
          setPageState('error');
          return;
        }
        if (d.status === 'accepted') {
          setPageState('already_accepted');
          return;
        }
        if (d.status === 'revoked') {
          setErrorMsg('ההזמנה בוטלה');
          setPageState('error');
          return;
        }
        setInvite(d as InviteInfo);
        setPageState('ready');
      })
      .catch(() => {
        setErrorMsg('שגיאה בטעינת ההזמנה');
        setPageState('error');
      });
  }, [token]);

  const handleAccept = async () => {
    if (!userEmail) {
      // Store token in sessionStorage and redirect to login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_invite_token', token);
      }
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setPageState('accepting');
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json() as { error?: string; brand_id?: string; success?: boolean };
      if (data.error) {
        if (data.error === 'own_brand') {
          setPageState('own_brand');
        } else {
          setErrorMsg(data.error === 'invalid_token' ? 'ההזמנה לא תקפה' : data.error);
          setPageState('error');
        }
        return;
      }
      setAcceptedBrandId(data.brand_id ?? null);
      setPageState('accepted');
    } catch {
      setErrorMsg('שגיאה בקבלת ההזמנה');
      setPageState('error');
    }
  };

  const roleLabel = invite?.role === 'editor' ? 'עורך' : 'צופה';
  const roleBg = invite?.role === 'editor' ? '#dbeafe' : '#f3f4f6';
  const roleColor = invite?.role === 'editor' ? '#1d4ed8' : '#374151';

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--brand-mist)', fontFamily: "'Heebo', 'Assistant', sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Brand gradient header */}
        <div
          className="rounded-t-3xl h-3 w-full"
          style={{ background: 'var(--brand-gradient)' }}
        />

        <div className="card rounded-t-none rounded-b-3xl p-8 shadow-xl">
          {pageState === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 rounded-full border-4 border-teal-200 border-t-teal-500 animate-spin" />
              <p className="text-gray-400 text-sm">טוען הזמנה...</p>
            </div>
          )}

          {pageState === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl">❌</div>
              <h2 className="font-black text-gray-900 text-xl">שגיאה</h2>
              <p className="text-gray-500 text-sm">{errorMsg}</p>
              <button onClick={() => router.push('/dashboard')} className="btn btn-ghost text-sm mt-2">
                חזור לדשבורד
              </button>
            </div>
          )}

          {pageState === 'own_brand' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-3xl">🤔</div>
              <h2 className="font-black text-gray-900 text-xl">לא ניתן לקבל</h2>
              <p className="text-gray-500 text-sm">אי אפשר לקבל הזמנה למותג שאתה הבעלים שלו</p>
              <button onClick={() => router.push('/dashboard')} className="btn btn-ghost text-sm mt-2">
                חזור לדשבורד
              </button>
            </div>
          )}

          {pageState === 'already_accepted' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl">✅</div>
              <h2 className="font-black text-gray-900 text-xl">הגישה כבר אושרה</h2>
              <p className="text-gray-500 text-sm">ההזמנה הזו כבר התקבלה בעבר</p>
              <button onClick={() => router.push('/dashboard')} className="btn btn-orange text-sm mt-2">
                כניסה לדשבורד
              </button>
            </div>
          )}

          {pageState === 'accepted' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl">🎉</div>
              <h2 className="font-black text-gray-900 text-xl">הגישה אושרה!</h2>
              <p className="text-gray-500 text-sm">
                הצטרפת בהצלחה למותג. תוכל לראות אותו בדשבורד שלך.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-orange text-sm mt-2"
              >
                לדשבורד ←
              </button>
            </div>
          )}

          {(pageState === 'ready' || pageState === 'accepting') && invite && (
            <div className="flex flex-col gap-6">
              {/* Brand info */}
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '2px solid #bae6fd' }}
                >
                  {invite.brand_emoji}
                </div>
                <p className="text-sm text-gray-400 mb-1">הוזמנת להצטרף למותג</p>
                <h2 className="font-black text-gray-900 text-2xl">{invite.brand_name}</h2>
              </div>

              {/* Role badge */}
              <div className="flex justify-center">
                <span
                  className="text-sm font-bold px-4 py-1.5 rounded-full"
                  style={{ background: roleBg, color: roleColor }}
                >
                  הרשאה: {roleLabel}
                </span>
              </div>

              {/* Not logged in warning */}
              {!userEmail && (
                <div
                  className="rounded-2xl p-4 text-sm text-amber-700"
                  style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}
                >
                  <p className="font-bold mb-1">יש להתחבר תחילה</p>
                  <p className="text-amber-600">לאחר ההתחברות תחזור אוטומטית לדף זה</p>
                </div>
              )}

              {/* Logged in as */}
              {userEmail && (
                <div
                  className="rounded-2xl p-3 text-sm text-gray-500 text-center"
                  style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}
                >
                  מחובר כ: <span className="font-bold text-gray-700">{userEmail}</span>
                </div>
              )}

              {/* Accept button */}
              <button
                onClick={handleAccept}
                disabled={pageState === 'accepting'}
                className="btn btn-orange text-base py-3"
              >
                {pageState === 'accepting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    מעבד...
                  </span>
                ) : userEmail ? 'קבל גישה' : 'התחבר וקבל גישה'}
              </button>

              <p className="text-center text-xs text-gray-300">
                על ידי קבלת ההזמנה, תקבל גישה לנתוני המותג
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

const TERMS_KEY = 'termsAgreed';

export default function TermsModal() {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TERMS_KEY)) {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const handleAgree = () => {
    try {
      localStorage.setItem(TERMS_KEY, JSON.stringify({ agreed: true, agreedAt: Date.now() }));
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-gray-900 mb-1">서비스 이용 약관</h2>
          <p className="text-xs text-gray-500 mb-4">서비스 이용 전 아래 내용을 확인해 주세요.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800 max-h-48 overflow-y-auto mb-4">
            <p className="font-semibold mb-1">법적 면책 조항 (Legal Disclaimer)</p>
            <p>
              본 서비스는 청약 정보를 쉽게 이해할 수 있도록 돕기 위한 참고용 가이드이며,
              법적 효력이 있는 공식 자격 판정이 아닙니다. 실제 청약 자격 및 가점은 관련 법령,
              사업 주체의 공고문, 한국부동산원의 공식 기준에 따라 다를 수 있습니다.
            </p>
            <p className="mt-2">
              청약 신청 전 반드시 공식 청약홈(applyhome.co.kr) 및 모집공고문을 직접 확인하시기
              바랍니다. 본 서비스의 정보를 기반으로 한 투자·청약 결정에 대한 책임은 이용자
              본인에게 있습니다.
            </p>
            <p className="mt-2">
              본 서비스는 개인정보를 수집하지 않으며, 입력한 정보는 브라우저 로컬 스토리지에만
              저장됩니다.
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-4 h-4 accent-blue-600 flex-shrink-0"
            />
            <span className="text-sm text-gray-700">위 내용을 확인하고 동의합니다.</span>
          </label>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={handleAgree}
            disabled={!checked}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors"
          >
            동의하고 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

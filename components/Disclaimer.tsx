export default function Disclaimer() {
  return (
    <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
      <p className="font-semibold mb-1">법적 면책 조항 (Legal Disclaimer)</p>
      <p>
        본 서비스는 청약 정보를 쉽게 이해할 수 있도록 돕기 위한 참고용
        가이드이며, 법적 효력이 있는 공식 자격 판정이 아닙니다. 실제 청약 자격
        및 가점은 관련 법령, 사업 주체의 공고문, 한국부동산원의 공식 기준에
        따라 다를 수 있습니다.
      </p>
      <p className="mt-1">
        청약 신청 전 반드시 공식 청약홈(
        <a
          href="https://www.applyhome.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          applyhome.co.kr
        </a>
        ) 및 모집공고문을 직접 확인하시기 바랍니다. 본 서비스의 정보를 기반으로
        한 투자·청약 결정에 대한 책임은 이용자 본인에게 있습니다.
      </p>
    </div>
  );
}

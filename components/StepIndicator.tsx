interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const percent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="flex flex-1 items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`${totalSteps}개 질문 중 ${currentStep}번째`}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-500 tabular-nums">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
}

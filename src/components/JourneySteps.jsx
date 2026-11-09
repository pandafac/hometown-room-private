export default function JourneySteps({ current = 1, labels = ["选地区", "选小镇", "选店铺"] }) {
  return (
    <ol className="journey-steps" aria-label="当前选择进度">
      {labels.map((label, index) => {
        const number = index + 1;
        const state = number < current ? "done" : number === current ? "current" : "upcoming";
        return (
          <li className={`journey-step journey-step--${state}`} key={label}>
            <span>{String(number).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

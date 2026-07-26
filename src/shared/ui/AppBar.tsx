type Props = {
  title: string;
  /** Large titles add empty vertical space — avoid on mobile home screens */
  large?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  subtitle?: string;
};

export function AppBar({ title, large, leading, trailing, subtitle }: Props) {
  return (
    <header className={`ui-appbar ${large ? "ui-appbar--large" : "ui-appbar--compact"}`}>
      <div className="ui-appbar__row">
        {leading && <div className="ui-appbar__leading">{leading}</div>}
        <div className="ui-appbar__titles">
          <h1 className={large ? "ui-appbar__display" : "ui-appbar__title"}>{title}</h1>
          {subtitle && <p className="ui-appbar__sub">{subtitle}</p>}
        </div>
        {trailing && <div className="ui-appbar__trailing">{trailing}</div>}
      </div>
    </header>
  );
}

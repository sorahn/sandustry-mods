type FixtureProps = { label: string; disabled?: boolean };

const Child = ({ label }: FixtureProps) => <span>{label}</span>;

const _fixture = (
  <button disabled={false} {...{ "data-test": "jsx" }} onClick={() => "clicked"}>
    <Child label="Sand" />
    {["a", "b"].map((value) => (
      <span key={value}>{value}</span>
    ))}
  </button>
);

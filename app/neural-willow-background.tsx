import Image from "next/image";

export function NeuralWillowBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/neural-willow-void.png"
          alt=""
          fill
          sizes="100vw"
          quality={75}
          loading="eager"
          className="object-cover object-center opacity-65"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.26),rgba(2,6,23,0.7)_82%),radial-gradient(circle_at_50%_45%,transparent_0%,rgba(2,6,23,0.45)_100%)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.13),transparent_40%),radial-gradient(circle_at_10%_85%,rgba(45,212,191,0.1),transparent_30%)]" />
    </>
  );
}

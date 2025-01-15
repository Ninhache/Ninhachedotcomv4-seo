import Link from "next/link";
import AnimatedComponent from "../AnimatedComponent";
import styles from "@/styles/header.module.css";

interface HeaderItemProps {
  name: string;
  anchor: string;
  delay: number;
  onClick?: () => void;
}

const HeaderItem: React.FC<HeaderItemProps> = ({
  name,
  anchor,
  delay,
  onClick,
}) => {
  const lowerName = name.toLocaleLowerCase();
  return (
    <AnimatedComponent delay={delay}>
      <div onClick={onClick} className={styles[lowerName]}>
        <Link className={styles.not_button} href={`#${anchor}`}>
          {name}
        </Link>
      </div>
    </AnimatedComponent>
  );
};

export default HeaderItem;

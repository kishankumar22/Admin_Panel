import { Link } from 'react-router-dom';
interface BreadcrumbProps {
  pageName: string;
}
const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  return (
    <div className="p-2 flex  flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-title-md2 font-semibold text-black dark:text-white">
        {pageName}
      </h2>
      <nav>
        <ol className="flex items-center gap-1">
          <li>
            <Link className="font-medium text-black-2" to="/">
              Dashboard /
            </Link>
          </li>
          <li className="font-medium text-primary"> {pageName}</li>
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;

import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";

export default function IntroFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link
          className="footer-brand"
          to={`${ROUTES.intro}#top`}
          aria-label="MSG CTF 2026 처음으로"
        >
          <span className="footer-logo">
            <img
              src="/assets/login/logo-cutout.png"
              width="1254"
              height="1254"
              alt=""
            />
          </span>
          <span className="footer-name">MSG CTF 2026</span>
        </Link>
        <p className="copyright" lang="en">
          © 2026 MSG CTF <span>All rights reserved</span>
        </p>
      </div>
    </footer>
  );
}

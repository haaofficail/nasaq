import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function SchoolScheduleWeeksPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/school/academic-calendar", { replace: true }); }, []);
  return null;
}

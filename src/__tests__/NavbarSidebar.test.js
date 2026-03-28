import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import NavbarSidebar from "../NavbarSidebar";

const defaultProps = {
  handleClickHomeBtn: jest.fn(),
  handleEditNoteBtn: jest.fn(),
  handleSearchNotes: jest.fn(),
  darkMode: false,
  showSettings: false,
  showTableConverter: false,
  workspaceName: "Default",
  sidebarCollapsed: false,
  onToggleCollapse: jest.fn(),
  onOpenSettings: jest.fn(),
  onOpenTableConverter: jest.fn(),
};

describe("NavbarSidebar", () => {
  test("renders sidebar with Notes title", () => {
    render(<NavbarSidebar {...defaultProps} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  test("shows Settings title when showSettings is true", () => {
    render(<NavbarSidebar {...defaultProps} showSettings={true} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  test("shows Table Converter title when showTableConverter is true", () => {
    render(<NavbarSidebar {...defaultProps} showTableConverter={true} />);
    expect(screen.getByText("Table Converter")).toBeInTheDocument();
  });

  test("shows workspace name when not Default", () => {
    render(<NavbarSidebar {...defaultProps} workspaceName="Work" />);
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  test("Home button calls handleClickHomeBtn", () => {
    render(<NavbarSidebar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Go to home page"));
    expect(defaultProps.handleClickHomeBtn).toHaveBeenCalled();
  });

  test("Settings button calls onOpenSettings", () => {
    render(<NavbarSidebar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(defaultProps.onOpenSettings).toHaveBeenCalled();
  });

  test("New Note button is disabled when in settings", () => {
    render(<NavbarSidebar {...defaultProps} showSettings={true} />);
    expect(screen.getByLabelText("Create new note")).toBeDisabled();
  });

  test("Search button is disabled when in settings", () => {
    render(<NavbarSidebar {...defaultProps} showSettings={true} />);
    expect(screen.getByLabelText("Toggle search")).toBeDisabled();
  });

  test("renders collapsed sidebar with expand button", () => {
    render(<NavbarSidebar {...defaultProps} sidebarCollapsed={true} />);
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });

  test("shows search input when search is toggled", () => {
    render(<NavbarSidebar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Toggle search"));
    expect(screen.getByLabelText("Search notes")).toBeInTheDocument();
  });
});

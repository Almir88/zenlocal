// ... existing code ...

ngAfterViewInit(): void {
  const sidebarItems: SidebarItem[] = this.app.sidebar;
  // ... existing code ...
  sidebarItems.push({
    label: 'test',
    link: 'test',
  });
}

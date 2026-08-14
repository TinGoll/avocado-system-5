class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const getComputedStyle = window.getComputedStyle.bind(window);

vi.spyOn(window, 'getComputedStyle').mockImplementation((element) =>
  getComputedStyle(element),
);

// Make functions globally available
function showToast(message, duration = 2000) {
    const toast = document.querySelector('.toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }
  
  function handleSwipeGesture(touchStartX, touchEndX, callbacks) {
    const swipeThreshold = 50;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) < swipeThreshold) return;
  
    if (diff > 0) {
      callbacks.onRight?.();
    } else {
      callbacks.onLeft?.();
    }
  }
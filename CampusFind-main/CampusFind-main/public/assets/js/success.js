const reference = new URLSearchParams(window.location.search).get('reference');
const referenceElement = document.getElementById('success-reference-number');
if (reference && referenceElement) referenceElement.textContent = reference;

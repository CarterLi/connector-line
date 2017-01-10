/**
 * @param {HTMLLIElement} el
 */
function removeElemRelatedLine(el) {
  if (!el.__lines) return;

  Object.values(el.__lines.start).forEach(lines => {
    lines.forEach(line => {
      line.remove();
      Object.values(line.__rect.end.__lines.end).some(arr => {
        const idx = arr.indexOf(line);
        if (~idx) {
          arr.splice(idx, 1);
          return true;
        }
      });
    });
  });
  Object.values(el.__lines.end).forEach(lines => {
    lines.forEach(line => {
      line.remove();
      Object.values(line.__rect.start.__lines.start).some(arr => {
        const idx = arr.indexOf(line);
        if (~idx) {
          arr.splice(idx, 1);
          return true;
        }
      });
    });
  });

  el.__lines = {
    start: {
      top: [],
      right: [],
      bottom: [],
      left: [],
    },
    end: {
      top: [],
      right: [],
      bottom: [],
      left: [],
    },
  };
}

angular.module('app', ['gridster'])
.controller('RootController', function ($scope) {
  // IMPORTANT: Items should be placed in the grid in the order in which they should appear.
  // In most cases the sorting should be by row ASC, col ASC

  // these map directly to gridsterItem directive options
  this.standardItems = [
    { sizeX: 1, sizeY: 1, row: 0, col: 0 },
    { sizeX: 1, sizeY: 1, row: 0, col: 1 },
    { sizeX: 1, sizeY: 1, row: 0, col: 2 },
    { sizeX: 1, sizeY: 1, row: 0, col: 3 },
    { sizeX: 1, sizeY: 1, row: 0, col: 4 },
    { sizeX: 1, sizeY: 1, row: 1, col: 0 },
    { sizeX: 1, sizeY: 1, row: 1, col: 1 },
    { sizeX: 1, sizeY: 1, row: 1, col: 2 },
    { sizeX: 1, sizeY: 1, row: 1, col: 3 },
    { sizeX: 1, sizeY: 1, row: 1, col: 4 },
    { sizeX: 1, sizeY: 1, row: 2, col: 0 }
  ];

  this.drawing = true;

  this.gridsterOpts = {
    margins: [80, 80],
    resizable: {
      enabled: !this.drawing,
    },
    draggable: {
      enabled: !this.drawing,
    },
  };

  this.onDrawingChanged = () => {
    this.gridsterOpts.draggable.enabled = !this.drawing;
    this.gridsterOpts.resizable.enabled = !this.drawing;
  };
})
.directive('drawLine', function ($parse, $rootScope) {
  /**
   * @param {SVGPoint} point
   * @param {ClientRect} rect
   */
  function detectPointToLink(point, rect) {
    if (point.y / point.x < rect.width / rect.width) {
      // 右上
      if (point.y / (rect.width - point.x) < rect.width / rect.width) {
        return 'top';
      } else {
        return 'right';
      }
    } else {
      if (point.y / (rect.width - point.x) < rect.width / rect.width) {
        return 'left';
      } else {
        return 'bottom';
      }
    }
  }

  /**
   * @param {SVGLineElement} line
   * @param {HTMLLIElement} elem
   * @param {string} position
   * @param {number} pointType
   */
  function setLinePoint(line, elem, position, pointType) {
    const jLine = angular.element(line);
    switch (position) {
      case 'left':
        jLine.attr('x' + pointType, elem.offsetLeft);
        jLine.attr('y' + pointType, elem.offsetTop + elem.offsetHeight / 2);
        break;

      case 'right':
        jLine.attr('x' + pointType, elem.offsetLeft + elem.offsetWidth);
        jLine.attr('y' + pointType, elem.offsetTop + elem.offsetHeight / 2);
        break;

      case 'top':
        jLine.attr('x' + pointType, elem.offsetLeft + elem.offsetWidth / 2);
        jLine.attr('y' + pointType, elem.offsetTop);
        break;

      case 'bottom':
        jLine.attr('x' + pointType, elem.offsetLeft + elem.offsetWidth / 2);
        jLine.attr('y' + pointType, elem.offsetTop + elem.offsetHeight);
        break;
    }
  }

  return {
    restrict: 'A',
    link(scope, element, attrs) {
      /**
       * @type {HTMLULElement}
       */
      const parent = element[0];
      const emptyImage = new Image();
      emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

      /**
       * @type {SVGSVGElement}
       */
      const svg = document.querySelector(attrs.drawLineSvg);

      /**
       * @type {SVGLineElement}
       */
      let drawingLine;

      /**
       * @type {HTMLLIElement}
       */
      let draggingElement;

      new MutationObserver(mutations => {
        mutations.forEach(m => {
          [...m.addedNodes].filter(n => n.tagName === 'LI').forEach(
          /**
           * @param {HTMLLIElement} elem
           */
          elem => {
            elem.__lines = {
              start: {
                top: [],
                right: [],
                bottom: [],
                left: [],
              },
              end: {
                top: [],
                right: [],
                bottom: [],
                left: [],
              },
            };

            elem.addEventListener('dragstart', event => {
              console.debug('dragstart');
              drawingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              drawingLine.setAttribute('marker-end', 'url(#triangle)');
              drawingLine.__rect = {
                start: null,
                end: null,
              };

              const rect = elem.getBoundingClientRect();

              const position = elem.dataset.highlight = detectPointToLink({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              }, rect);

              setLinePoint(drawingLine, elem, position, 1);

              const svgRect = svg.getBoundingClientRect();
              drawingLine.setAttribute('x2', Math.abs(event.clientX - svgRect.left));
              drawingLine.setAttribute('y2', Math.abs(event.clientY - svgRect.top));
              svg.appendChild(drawingLine);

              event.dataTransfer.effectAllowed = 'link';
              event.dataTransfer.setDragImage(emptyImage, 0, 0);
              event.dataTransfer.setData('application/x-drawline', drawingLine);
              draggingElement = elem;
            });
            elem.addEventListener('drag', event => {
              console.info('drag');
              if (event.clientX && event.clientY) {
                const svgRect = svg.getBoundingClientRect();
                drawingLine.setAttribute('x2', Math.abs(event.clientX - svgRect.left));
                drawingLine.setAttribute('y2', Math.abs(event.clientY - svgRect.top));
              }
            });
            elem.addEventListener('drop', event => {
              console.debug('drop');
              elem.classList.remove('dragging');
              if (drawingLine) {
                const position = elem.dataset.highlight;
                setLinePoint(drawingLine, elem, position, 2);
                elem.__lines.end[position].push(drawingLine);
                drawingLine.__rect.end = elem;
              }
            });
            elem.addEventListener('dragleave', event => {
              console.debug('dragleave', elem.dataset.index, elem.className);
              elem.classList.remove('dragging');
            });
            elem.addEventListener('dragover', event => {
              // We don't use dragenter because it's called twice sometimes
              console.debug('dragover', elem.dataset.index, elem.className);
              if (draggingElement && draggingElement !== elem && ~event.dataTransfer.types.indexOf('application/x-drawline')) {
                elem.classList.add('dragging');

                const rect = elem.getBoundingClientRect();

                elem.dataset.highlight = detectPointToLink({
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                }, rect);

                event.preventDefault();
              }
            });
            elem.addEventListener('dragend', event => {
              console.log('dragend');
              if (event.dataTransfer.dropEffect === 'none') {
                drawingLine.remove();
                drawingLine = null;
              } else {
                const position = elem.dataset.highlight;
                elem.__lines.start[position].push(drawingLine);
                drawingLine.__rect.start = elem;
              }
              draggingElement = null;
            });
          });
        });
      }).observe(parent, { childList: true });

      // WARNING: Slow
      requestAnimationFrame(function resetLinePoints() {
        Array.from(parent.children).forEach(el => {
          Object.entries(el.__lines.start).forEach(([position, lines]) => {
            setLinePoint(lines, el, position, 1);
          });
          Object.entries(el.__lines.end).forEach(([position, lines]) => {
            setLinePoint(lines, el, position, 2);
          });
        });
        requestAnimationFrame(resetLinePoints);
      });
    },
  };
});

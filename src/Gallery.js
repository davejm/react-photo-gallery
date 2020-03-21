import React, { useState, useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import ResizeObserver from 'resize-observer-polyfill';
import Photo, { photoPropType } from './Photo';
import { computeColumnLayout } from './layouts/columns';
import { computeRowLayout } from './layouts/justified';
import { findIdealNodeSearch } from './utils/findIdealNodeSearch';
const _ = require('lodash')

const Gallery = React.memo(function Gallery({
  photos,
  onClick,
  direction,
  margin,
  limitNodeSearch,
  targetRowHeight,
  columns,
  renderImage,
  enableDebounce,
  debounceTime,
  addHeight,
  layoutFinished
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const galleryEl = useRef(null);

  // console.log(containerWidth)

  const debouncedSetContainerWidth = _.debounce(setContainerWidth, debounceTime);

  useLayoutEffect(() => {
    // console.log("photo: useLayoutEffect")
    let animationFrameID = null;
    const observer = new ResizeObserver(entries => {
      // only do something if width changes
      const newWidth = entries[0].contentRect.width;
      if (containerWidth !== newWidth) {
        // put in an animation frame to stop "benign errors" from
        // ResizObserver https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
        animationFrameID = window.requestAnimationFrame(() => {
          // Immediately setContainerWidth if previous value was 0 or debounce is disabled
          if (containerWidth === 0 || !enableDebounce) {
            setContainerWidth(Math.floor(newWidth));
          } else {
            debouncedSetContainerWidth(Math.floor(newWidth));
          }
        });
      }
    });
    observer.observe(galleryEl.current);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrameID);
    };
  });

  useEffect(() => {
    // console.log("photo: useEffect")
    // console.log(containerWidth)
    if (containerWidth !== 0) {
      layoutFinished()
    }
  })

  const handleClick = (event, { index }) => {
    onClick(event, {
      index,
      photo: photos[index],
      previous: photos[index - 1] || null,
      next: photos[index + 1] || null,
    });
  };

  // no containerWidth until after first render with refs, skip calculations and render nothing
  if (!containerWidth) return (
    <div className="react-photo-gallery--gallery">
      <div ref={galleryEl}>&nbsp;</div>
    </div>
  )
  // subtract 1 pixel because the browser may round up a pixel
  const width = containerWidth - 1;
  let galleryStyle, thumbs;

  if (direction === 'row') {
    // allow user to calculate limitNodeSearch from containerWidth
    if (typeof limitNodeSearch === 'function') {
      limitNodeSearch = limitNodeSearch(containerWidth);
    }
    if (typeof targetRowHeight === 'function') {
      targetRowHeight = targetRowHeight(containerWidth);
    }
    if (typeof margin === 'function') {
      margin = margin(containerWidth);
    }
    if (typeof addHeight === 'function') {
      addHeight = addHeight(containerWidth);
    }
    // set how many neighboring nodes the graph will visit
    if (limitNodeSearch === undefined) {
      limitNodeSearch = 2;
      if (containerWidth >= 450) {
        limitNodeSearch = findIdealNodeSearch({ containerWidth, targetRowHeight });
      }
    }

    galleryStyle = { display: 'flex', flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'space-between' };
    thumbs = computeRowLayout({ containerWidth: width, limitNodeSearch, targetRowHeight, margin, addHeight, photos });
  }
  if (direction === 'column') {
    // allow user to calculate columns from containerWidth
    if (typeof columns === 'function') {
      columns = columns(containerWidth);
    }
    // set default breakpoints if user doesn't specify columns prop
    if (columns === undefined) {
      columns = 1;
      if (containerWidth >= 500) columns = 2;
      if (containerWidth >= 900) columns = 3;
      if (containerWidth >= 1500) columns = 4;
    }
    galleryStyle = { position: 'relative' };
    thumbs = computeColumnLayout({ containerWidth: width, columns, margin, photos });
    galleryStyle.height = thumbs[thumbs.length - 1].containerHeight;
  }

  const renderComponent = renderImage || Photo;
  return (
    <div className="react-photo-gallery--gallery">
      <div ref={galleryEl} style={galleryStyle}>
        {thumbs.map((thumb, index) => {
          const { left, top, containerHeight, justified, ...photo } = thumb;
          return renderComponent({
            left,
            top,
            key: thumb.key || thumb.src,
            containerHeight,
            index,
            margin,
            direction,
            onClick: onClick ? handleClick : null,
            justified,
            addHeight,
            photo,
          });
        })}
      </div>
    </div>
  );
});

Gallery.propTypes = {
  photos: PropTypes.arrayOf(photoPropType).isRequired,
  direction: PropTypes.string,
  onClick: PropTypes.func,
  columns: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  targetRowHeight: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  limitNodeSearch: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  margin: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  renderImage: PropTypes.func,
  enableDebounce: PropTypes.bool,
  debounceTime: PropTypes.number,
  addHeight: PropTypes.oneOfType([PropTypes.func, PropTypes.number])
};

Gallery.defaultProps = {
  margin: 2,
  direction: 'row',
  targetRowHeight: 300,
  enableDebounce: true,
  debounceTime: 100,
  addHeight: 0,
  layoutFinished: () => {}
};
export { Photo };
export default Gallery;

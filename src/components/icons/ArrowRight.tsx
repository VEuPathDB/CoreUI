import { SVGProps } from "react";

const ArrowRight = (props: SVGProps<SVGSVGElement>) => {
    const { height = '1em', width = '1em' } = props;
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="52 84 216 344"
            height={height}
            width={width}
            {...props}
        >
            {/* Font Awesome Pro 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. */}
            <path d="M246.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-9.2-9.2-22.9-11.9-34.9-6.9s-19.8 16.6-19.8 29.6l0 256c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l128-128z"/>
        </svg>
    )
}

export default ArrowRight;
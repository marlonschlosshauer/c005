# One seat per refund request

Each refund request concerns exactly one purchased seat and has its own decision and refund amount. We chose this over a request containing multiple seats with potentially different decisions and amounts, so each request has a single outcome; a bulk user action may create several independent requests without changing this boundary.

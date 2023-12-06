"use client";

import { Col, Container, Row } from "react-bootstrap";
import Alert from "react-bootstrap/Alert";

export default function NotFoundAlert() {
  return (
    <Container fluid>
      {/* <Row>
        <Col md="8"> */}
      <Alert variant="info">
        <Alert.Heading>Nothing found</Alert.Heading>
        <p>
          No evidence of any Amazon Linux (AL1) instances or Auto Scaling Groups
          was found.
        </p>
      </Alert>
      {/* </Col>
      </Row> */}
    </Container>
  );
}

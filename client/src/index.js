import React from "react";
import ReactDOM from "react-dom";
import {Provider} from 'react-redux';
import configureStore from './store/configureStore';
import LogsViewer from './components/logsViewer'
import Applications from './components/applications'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

const store = configureStore();


ReactDOM.render(
<Provider store={store}>
            <Container fluid={true}>
            <Row>
                <Col lg={2}>
                    <Applications/>
                </Col>
                <Col lg={10}>
                    <LogsViewer/>
                </Col>
            </Row>
            </Container>
    </Provider>, document.getElementById("index"));
